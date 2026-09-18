"""Build an original, rigged low-poly companion. Run with Blender --background.

No external model is opened or imported. All geometry, UVs, weights, the palette
atlas and animation keys below are authored here from simple mathematical forms.
Blender coordinates: X right, -Y forward, Z up; export converts to glTF Y-up.
"""
import bpy
import bmesh
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/models/residence-cat'
SOURCE = ROOT / 'art-source/residence-cat'
DEST.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0

# Original 4 x 4 palette atlas. This is intentionally painted in code, not sampled
# from the supplied reference GLB. UV islands have their own padded palette tile.
colors = ['f4ecdb', 'ad9180', '8d7365', 'fff8e9', 'd8989f', '6fa6c5',
          '344354', 'fffef6', 'cfb8a0', 'cab5a2', 'eab7b1', 'ece0cc',
          '6085a5', '564b48', 'b3d7e3', 'e7d5c2']
atlas = bpy.data.images.new('Companion_OriginalPalette', width=128, height=128, alpha=True)
pixels = []
for y in range(128):
    for x in range(128):
        c = colors[(y // 32) * 4 + x // 32]
        shade = 1 - 0.018 * ((x * 13 + y * 7) % 11) / 10
        pixels.extend([int(c[i:i+2], 16) / 255 * shade for i in (0, 2, 4)] + [1])
atlas.pixels = pixels
atlas.filepath_raw = str(SOURCE / 'palette.png')
atlas.file_format = 'PNG'
atlas.save()
atlas.pack()
mat = bpy.data.materials.new('Companion_MattePorcelain')
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .83
tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = atlas
tex.interpolation = 'Linear'
mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])

vertices, faces, uv_faces, weights = [], [], [], []
fused_vertices = []
fuse_surface = True
def add_mesh(verts, polys, color, binding, uvs=None):
    offset = len(vertices)
    vertices.extend(verts)
    fused_vertices.extend([fuse_surface] * len(verts))
    weights.extend([binding(v) if callable(binding) else binding.copy() for v in verts])
    for poly in polys:
        faces.append([offset + i for i in poly])
        tile_x, tile_y = color % 4, color // 4
        coords = [uvs[i] if uvs else (0.2 + .6*(k % 2), 0.2 + .6*(k // 2 % 2)) for k, i in enumerate(poly)]
        uv_faces.append([((tile_x + .08 + .84*u) / 4, (tile_y + .08 + .84*v) / 4) for u,v in coords])

def ellipsoid(center, radii, color, binding, sides=14, rings=9):
    sides = max(24, sides * 2)
    rings = max(16, rings * 2)
    vv, ff, uv = [], [], []
    for j in range(rings + 1):
        phi = math.pi * j / rings
        for i in range(sides + 1):
            theta = math.tau * i / sides
            vv.append(tuple(center[k] + radii[k] * q for k,q in enumerate((math.sin(phi)*math.cos(theta), math.sin(phi)*math.sin(theta), math.cos(phi)))))
            uv.append((i/sides, j/rings))
    for j in range(rings):
        for i in range(sides):
            a = j*(sides+1)+i
            if j != 0: ff.append((a, a+1, a+sides+1))
            if j != rings-1: ff.append((a+1, a+sides+2, a+sides+1))
    add_mesh(vv, ff, color, binding, uv)

def body_weight(v):
    front = max(0, min(1, (.3 - v[1]) / .7))
    return {'Pelvis': 1-front, 'Chest': front}

ellipsoid((0,.06,.58), (.305,.50,.31), 0, body_weight, 18, 11)
# Coffee saddle follows the body surface with a soft, faceted outline.
ellipsoid((0,.15,.68), (.294,.40,.224), 9, body_weight, 16, 9)
ellipsoid((0,-.28,.64), (.295,.27,.34), 3, {'Chest':1}, 16, 9)
ellipsoid((0,-.47,.88), (.35,.298,.32), 1, {'Head':1}, 20, 13)
ellipsoid((0,-.646,.73), (.265,.168,.145), 3, {'Head':1}, 16, 8)
# White inverted-V blaze, on the head surface, made from new vertices.
fuse_surface = False
vv, ff, uv = [], [], []
for row in range(9):
    z = 1.154 - row*.041
    width = .022 + (row/8)**1.35*.17
    for col in range(7):
        x = width*(col/3-1)
        q = max(.025, 1-(x/.35)**2-((z-.88)/.32)**2)
        vv.append((x,-.47-.298*math.sqrt(q)-.004,z))
        uv.append((col/6,row/8))
for row in range(8):
    for col in range(6):
        a=row*7+col
        ff.extend([(a,a+7,a+1),(a+1,a+7,a+8)])
# Facial blaze is painted onto the fused surface below, not a raised patch.
for side in [-1,1]:
    fuse_surface = True
    ellipsoid((side*.096,-.758,.77), (.123,.079,.095), 3, {'Head':1}, 12, 8)
    # A shallow skin collar blends into the head; the blue lens sits inside it.
    ellipsoid((side*.166,-.706,.955), (.097,.036,.109), 1, {'Head':1}, 16, 10)
    fuse_surface = False
    ellipsoid((side*.166,-.730,.955), (.075,.016,.088), 5, {'Head':1}, 16, 10)
    ellipsoid((side*.166,-.744,.954), (.05,.008,.068), 6, {'Head':1}, 14, 9)
    ellipsoid((side*.145,-.752,.985), (.018,.004,.022), 7, {'Head':1}, 10, 7)
    ellipsoid((side*.184,-.752,.929), (.008,.003,.009), 14, {'Head':1}, 8, 6)
    # Blush is surface color rather than protruding cheek disks.
    # Rounded tapered ear volume, deeply rooted in the head; no floating triangle.
    fuse_surface = True
    for j in range(9):
        t=j/8
        ellipsoid((side*(.216+.066*t),-.365-.035*t,1.075+.275*t),
                  (.118*(1-t)+.025,.09*(1-t)+.027,.068),1,
                  {'Head':1-t, f'Ear_{side}':t},12,8)
    fuse_surface = False
    # Pink follows the volumetric ear surface, not a separate sticker mesh.
    fuse_surface = True
    # Small cheek tufts remain part of the head skinned mesh.
    add_mesh([(side*.26,-.48,.82),(side*.397,-.38,.77),(side*.30,-.35,.71),(side*.24,-.52,.73)],[(0,1,2),(0,2,3),(3,2,1),(0,3,1)],0,{'Head':1})

fuse_surface = False
ellipsoid((0,-.826,.813),(.035,.023,.022),4,{'Head':1},12,8)
# Discreet mouth, freshly constructed geometry.
ellipsoid((0,-.832,.768),(.008,.005,.016),13,{'Jaw':1},8,6)
fuse_surface = True

bone_specs=[('Root',None,(0,0,0),(0,0,.2)),('Pelvis','Root',(0,.24,.55),(0,0,.59)),
            ('Chest','Pelvis',(0,0,.59),(0,-.29,.67)),('Neck','Chest',(0,-.29,.67),(0,-.4,.84)),
            ('Head','Neck',(0,-.4,.84),(0,-.67,.88)),('Jaw','Head',(0,-.64,.76),(0,-.79,.76))]
for side in [-1,1]:
    bone_specs.append((f'Ear_{side}','Head',(side*.22,-.35,1.08),(side*.29,-.4,1.34)))
    for kind,y in [('Front',-.31),('Hind',.36)]:
        x=side*.205
        hip=f'{kind}_{side}_Upper'; knee=f'{kind}_{side}_Lower'; paw=f'{kind}_{side}_Paw'
        bone_specs.extend([(hip,'Chest' if kind=='Front' else 'Pelvis',(x,y,.63),(x,y,.31)),
                           (knee,hip,(x,y,.31),(x,y-.022,.11)),(paw,knee,(x,y-.022,.11),(x,y-.16,.085))])
        def leg_weight(v, h=hip, k=knee):
            w=max(0,min(1,(v[2]-.24)/.18))
            return {h:w,k:1-w}
        ellipsoid((x,y,.34),(.105,.115,.255),0,leg_weight,12,9)
        ellipsoid((x,y-.052,.084),(.115,.158,.084),3,{paw:1},12,8)

tail_points=[(0,.43,.62),(0,.69,.62),(.025,.94,.70),(.07,1.13,.87),(.10,1.25,1.02),(.09,1.30,1.08)]
for i in range(5):
    bone_specs.append((f'Tail_{i}','Pelvis' if i==0 else f'Tail_{i-1}',tail_points[i],tail_points[i+1]))
vv,ff,uv=[],[],[]
for row in range(21):
    t=row/20*5; segment=min(4,int(t)); f=t-segment
    a,b=Vector(tail_points[segment]),Vector(tail_points[segment+1]); c=a.lerp(b,f)
    direction=(b-a).normalized(); across=Vector((1,0,0)); other=direction.cross(across).normalized()
    radius=.12*(math.sin(math.pi*(.13+row/20*.84))**.5)
    if row==20: radius=.007
    for col in range(11):
        angle=math.tau*col/10
        p=c+radius*(across*math.cos(angle)+other*math.sin(angle))
        vv.append(tuple(p)); uv.append((col/10,row/20))
for row in range(20):
    for col in range(10):
        a=row*11+col; ff.extend([(a,a+1,a+11),(a+1,a+12,a+11)])
start=len(vertices)
add_mesh(vv,ff,1,{'Tail_0':1},uv)
for i in range(len(vv)):
    t=(i//11)/20*4; low=min(3,int(t)); f=t-low
    weights[start+i]={f'Tail_{low}':1-f,f'Tail_{low+1}':f}

mesh=bpy.data.meshes.new('Companion_OriginalTopology')
mesh.from_pydata(vertices,[],faces); mesh.update()
assert not mesh.validate(verbose=True), 'Generated topology requires repair'
cat=bpy.data.objects.new('Companion_CreamBicolor',mesh); bpy.context.collection.objects.link(cat)
cat.data.materials.append(mat)
uv_layer=mesh.uv_layers.new(name='Companion_PaletteUV')
for poly,uv in zip(mesh.polygons,uv_faces):
    poly.use_smooth=True
    for li,coord in zip(poly.loop_indices,uv): uv_layer.data[li].uv=coord
# Recalculate hand-authored ear/patch winding consistently where applicable.
bpy.context.view_layer.objects.active=cat; cat.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
cat.select_set(False)
arm=bpy.data.armatures.new('Companion_OriginalSkeleton')
rig=bpy.data.objects.new('Companion_Rig',arm); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name,parent,head,tail in bone_specs:
    bone=arm.edit_bones.new(name); bone.head=head; bone.tail=tail
    if parent: bone.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
cat.parent=rig
mod=cat.modifiers.new('Companion_Skin','ARMATURE'); mod.object=rig
groups={name:cat.vertex_groups.new(name=name) for name,_,_,_ in bone_specs}
for i,binding in enumerate(weights):
    total=sum(binding.values())
    for name,w in binding.items():
        if w>0: groups[name].add([i],w/total,'REPLACE')

# Fuse the original overlapping anatomical volumes, not the eyes/markings.
# Transfer palette and existing skin weights before removing the source copy.
# Voxel spacing is bounded: enough silhouette detail without subdivision bloat.
source_cat=cat
source_cat.modifiers.clear()
def subset(name, keep_core):
    obj=source_cat.copy(); obj.data=source_cat.data.copy()
    obj.name=name; bpy.context.collection.objects.link(obj)
    bm=bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if fused_vertices[v.index] != keep_core],context='VERTS')
    bm.to_mesh(obj.data); bm.free()
    return obj
core=subset('Companion_FusedSurface',True)
details=subset('Companion_FacialDetails',False)
bpy.ops.object.select_all(action='DESELECT')
core.select_set(True); bpy.context.view_layer.objects.active=core
remesh=core.modifiers.new('Continuous anatomical surface','REMESH')
remesh.mode='VOXEL'; remesh.voxel_size=.018; remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=core.modifiers.new('Relax anatomical joins','SMOOTH'); smooth.factor=.65; smooth.iterations=3
bpy.ops.object.modifier_apply(modifier=smooth.name)
transfer=core.modifiers.new('Preserve palette and skin','DATA_TRANSFER')
transfer.object=source_cat
transfer.use_loop_data=True; transfer.data_types_loops={'UV'}; transfer.loop_mapping='POLYINTERP_NEAREST'
transfer.use_vert_data=True; transfer.data_types_verts={'VGROUP_WEIGHTS'}; transfer.vert_mapping='POLYINTERP_NEAREST'
bpy.ops.object.datalayout_transfer(modifier=transfer.name)
bpy.ops.object.modifier_apply(modifier=transfer.name)
# Continuous color interpolation avoids palette-island seams on the fused skin.
# These are the same existing swatches, not a new character design.
skin_mat=bpy.data.materials.new('Companion_ContinuousPalette'); skin_mat.use_nodes=True
skin_bsdf=skin_mat.node_tree.nodes.get('Principled BSDF')
skin_bsdf.inputs['Roughness'].default_value=.83
attribute=skin_mat.node_tree.nodes.new('ShaderNodeVertexColor'); attribute.layer_name='FurPalette'
skin_mat.node_tree.links.new(attribute.outputs['Color'],skin_bsdf.inputs['Base Color'])
core.data.materials.clear(); core.data.materials.append(skin_mat)
color_layer=core.data.color_attributes.new(name='FurPalette',type='FLOAT_COLOR',domain='POINT')
def rgb(index):
    srgb=[int(colors[index][i:i+2],16)/255 for i in (0,2,4)]
    return Vector(tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb))
def blend(a,b,t): return a.lerp(b,max(0,min(1,t)))
for v in core.data.vertices:
    x,y,z=v.co; color=rgb(0)
    if y>.47: color=rgb(1) # tail
    elif z>.66 and y>-.20:
        color=blend(color,rgb(9),(z-.66)/.10)
    if y<-.27 and z>.74:
        color=rgb(1)
        width=.022+max(0,min(1,(1.154-z)/.328))**1.35*.17
        white=max((width-abs(x))/.016 if y<-.55 else 0,
                  (.85-z)/.035 if y<-.63 else 0)
        color=blend(color,rgb(3),white)
        blush=math.exp(-((abs(x)-.25)/.038)**2-((z-.837)/.025)**2)*max(0,min(1,(-y-.63)/.045))
        color=blend(color,rgb(10),blush*.65)
    if z>1.12:
        t=max(0,min(1,(z-1.075)/.275)); center=.216+.066*t
        pink=max(0,1-((abs(x)-center)/.049)**2-((z-1.24)/.09)**2)
        color=blend(color,rgb(4),pink*max(0,min(1,(-y-.395)/.03)))
    if z<.15: color=rgb(3)
    color_layer.data[v.index].color=(*color,1)
# glTF exports COLOR_0 for both joined primitives. Neutral white must multiply
# the atlas on eyes/nose, rather than Blender's missing-attribute black default.
detail_colors=details.data.color_attributes.new(name='FurPalette',type='FLOAT_COLOR',domain='POINT')
for entry in detail_colors.data: entry.color=(1,1,1,1)
details.select_set(True)
bpy.ops.object.join()
bpy.data.objects.remove(source_cat,do_unlink=True)
cat=core; cat.name='Companion_CreamBicolor'
for poly in cat.data.polygons: poly.use_smooth=True
for v in cat.data.vertices:
    total=sum(g.weight for g in v.groups)
    assert total > 0, 'Unweighted fused vertex'
    for g in list(v.groups): cat.vertex_groups[g.group].add([v.index],g.weight/total,'REPLACE')
mod=cat.modifiers.new('Companion_Skin','ARMATURE'); mod.object=rig
cat.parent=rig
rig.select_set(True)
print('REFINED_TOPOLOGY',len(cat.data.vertices),'vertices',len(cat.data.polygons),'polygons')

# Five original semantic actions, all generated analytically from rest pose.
scene=bpy.context.scene; scene.render.fps=24
rig.animation_data_create()
for clip,duration in [('Idle',4),('Walk',1),('Rest',4),('Greet',2.5),('Jump',1)]:
    action=bpy.data.actions.new(clip); rig.animation_data.action=action
    frames=round(duration*24)
    for frame in range(0,frames+1,3):
        u=frame/frames; phase=math.tau*u
        for pb in rig.pose.bones:
            pb.rotation_mode='XYZ'; pb.rotation_euler=(0,0,0); pb.location=(0,0,0)
        rig.pose.bones['Head'].rotation_euler[1]=.045*math.sin(phase)
        for i in range(5): rig.pose.bones[f'Tail_{i}'].rotation_euler[1]=.08*math.sin(phase+i*.55)
        if clip=='Walk':
            for side in [-1,1]:
                for kind,offset in [('Front',0),('Hind',math.pi)]:
                    wave=math.sin(phase+offset+(math.pi if side==1 else 0))
                    rig.pose.bones[f'{kind}_{side}_Upper'].rotation_euler[0]=.30*wave
                    rig.pose.bones[f'{kind}_{side}_Lower'].rotation_euler[0]=-.20*max(0,wave)
        elif clip=='Rest':
            # Lower the torso while folding the legs under it; feet stay above base plane.
            rig.pose.bones['Root'].location[1]=-.18
            for side in [-1,1]:
                for kind in ['Front','Hind']:
                    rig.pose.bones[f'{kind}_{side}_Upper'].rotation_euler[0]=.9
                    rig.pose.bones[f'{kind}_{side}_Lower'].rotation_euler[0]=-1.4
            rig.pose.bones['Head'].rotation_euler[0]=.13+.018*math.sin(phase)
        elif clip=='Greet':
            rig.pose.bones['Head'].rotation_euler[1]=.18*math.sin(phase)
            rig.pose.bones['Head'].rotation_euler[0]=-.10*math.sin(math.pi*u)**2
            for side in [-1,1]: rig.pose.bones[f'Ear_{side}'].rotation_euler[1]=side*.10*math.sin(phase)
        elif clip=='Jump':
            for side in [-1,1]:
                for kind in ['Front','Hind']:
                    rig.pose.bones[f'{kind}_{side}_Upper'].rotation_euler[0]=.5*math.sin(math.pi*u)
                    rig.pose.bones[f'{kind}_{side}_Lower'].rotation_euler[0]=-.8*math.sin(math.pi*u)
        # Normalize each keyed pose against its evaluated foot contact plane.
        bpy.context.view_layer.update()
        evaluated=cat.evaluated_get(bpy.context.evaluated_depsgraph_get())
        lowest=min(v.co.z for v in evaluated.data.vertices)
        rig.pose.bones['Root'].location[1]-=lowest
        for pb in rig.pose.bones:
            pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
            pb.keyframe_insert('location',frame=frame,group=pb.name)
    action.use_fake_user=True
rig.animation_data.action=None
for pb in rig.pose.bones: pb.rotation_euler=(0,0,0); pb.location=(0,0,0)
scene.frame_set(0)
cat.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'companion-cat.blend'))
bpy.ops.export_scene.gltf(filepath=str(DEST/'companion-cat.glb'),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,
    export_materials='EXPORT',export_force_sampling=True,export_frame_range=False)
print('ORIGINAL_CAT',len(vertices),'vertices',len(faces),'faces',len(bone_specs),'bones')

# Neutral studio portrait for visual quality control, not shipped in the site.
rig.animation_data.action=bpy.data.actions.get('Idle'); scene.frame_set(0)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.005))
ground=bpy.context.object; ground.name='Preview_Ground'
gm=bpy.data.materials.new('Preview_Ground'); gm.diffuse_color=(.34,.47,.44,1); ground.data.materials.append(gm)
world=scene.world or bpy.data.worlds.new('Preview_World'); scene.world=world; world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.73,.78,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65
for location,power,size in [((2,-3,5),450,4),((-3,-1,3),250,3),((0,3,4),400,3)]:
    bpy.ops.object.light_add(type='AREA',location=location); light=bpy.context.object
    light.data.energy=power; light.data.shape='DISK'; light.data.size=size
    light.rotation_euler=(Vector((0,0,.6))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.5,-4.5,2.2))
camera=bpy.context.object; camera.rotation_euler=(Vector((0,.10,.65))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=2.55; scene.camera=camera
scene.render.engine='CYCLES'; scene.cycles.samples=24
scene.render.resolution_x=900; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'outputs/companion-cat-preview.png')
Path(scene.render.filepath).parent.mkdir(parents=True,exist_ok=True)
bpy.ops.render.render(write_still=True)
