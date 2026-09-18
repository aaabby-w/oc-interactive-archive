"""Check the original cat's skin, topology, UVs, and contact throughout its clips."""
import bpy
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/residence-cat/companion-cat.blend'))
cat=bpy.data.objects['Companion_CreamBicolor']
rig=bpy.data.objects['Companion_Rig']
assert len(rig.data.bones)==25
assert cat.data.uv_layers.active is not None
assert not cat.data.validate(verbose=True)
for vertex in cat.data.vertices:
    assert abs(sum(group.weight for group in vertex.groups)-1)<1e-5
assert {a.name for a in bpy.data.actions}=={'Idle','Walk','Rest','Greet','Jump'}
for action in bpy.data.actions:
    rig.animation_data.action=action
    if action.slots: rig.animation_data.action_slot=action.slots[0]
    contact=[]
    for frame in range(int(action.frame_range[0]),int(action.frame_range[1])+1):
        bpy.context.scene.frame_set(frame)
        evaluated=cat.evaluated_get(bpy.context.evaluated_depsgraph_get())
        contact.append(min(v.co.z for v in evaluated.data.vertices))
    print('CONTACT',action.name,'min',round(min(contact),5),'max',round(max(contact),5))
    assert min(contact)>-.015, f'{action.name}: ground penetration'
    assert max(contact)<.015, f'{action.name}: hovering above contact plane'
print('PASS: normalized skin weights, valid topology, UVs, five clips, floor contact')
